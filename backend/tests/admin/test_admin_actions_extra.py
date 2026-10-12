"""Admin actions that had no tests after integration: reinstate, unverify, internship status."""
import re
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import postgrest


def _skip_parens(text, i):
    """text[i] is '('; return the index just past its matching ')'."""
    depth = 0
    while i < len(text):
        if text[i] == "(":
            depth += 1
        elif text[i] == ")":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return i


def _top_level_chain(text, i):
    """Method names chained after the call whose '(' is at text[i], ignoring calls inside arguments."""
    names = []
    i = _skip_parens(text, i)
    while True:
        m = re.match(r"\s*\.(\w+)\(", text[i:])
        if not m:
            return names
        names.append(m.group(1))
        i = _skip_parens(text, i + m.end() - 1)


def _route_tables(mock_supabase, lookup_data, table="profiles"):
    """Wire mock_supabase.table() so select→maybe_single returns lookup_data and writes succeed."""
    lookup = MagicMock()
    lookup.eq.return_value.maybe_single.return_value.execute.return_value = (
        None if lookup_data is None else SimpleNamespace(data=lookup_data)
    )
    update = MagicMock()
    update.eq.return_value.execute.return_value = SimpleNamespace(data=[{}])
    insert = MagicMock()
    insert.execute.return_value = SimpleNamespace(data=[{}])
    tables = {}

    def table_router(name):
        t = tables.setdefault(name, MagicMock())
        if name == table:
            t.select.return_value = lookup
            t.update.return_value = update
        elif name == "decision_audit_log":
            t.insert.return_value = insert
        return t

    mock_supabase.table.side_effect = table_router
    return tables


@patch("routers.admin.supabase")
def test_reinstate_user_success_and_audited(mock_supabase, admin_client):
    tables = _route_tables(mock_supabase, {"id": "student-1"})
    res = admin_client.post("/api/admin/users/student-1/reinstate")
    assert res.status_code == 200
    assert res.json()["success"] is True
    tables["profiles"].update.assert_called_once()
    assert tables["profiles"].update.call_args[0][0]["is_suspended"] is False
    tables["decision_audit_log"].insert.assert_called_once()


@patch("routers.admin.supabase")
def test_reinstate_missing_user_returns_404(mock_supabase, admin_client):
    # supabase-py's maybe_single().execute() can return None when no row matches.
    _route_tables(mock_supabase, None)
    res = admin_client.post("/api/admin/users/nobody/reinstate")
    assert res.status_code == 404


@patch("routers.admin.supabase")
def test_unverify_employer_success_and_audited(mock_supabase, admin_client):
    tables = _route_tables(mock_supabase, {"id": "emp-1"})
    res = admin_client.post("/api/admin/employers/emp-1/unverify")
    assert res.status_code == 200
    assert tables["profiles"].update.call_args[0][0]["is_verified"] is False
    tables["decision_audit_log"].insert.assert_called_once()


@patch("routers.admin.supabase")
def test_admin_internship_status_update(mock_supabase, admin_client):
    tables = _route_tables(mock_supabase, {"id": "int-1", "status": "active"}, table="internships")
    res = admin_client.post("/api/admin/internships/int-1/status", json={"status": "closed", "reason": "Spam"})
    assert res.status_code == 200
    assert tables["internships"].update.call_args[0][0]["status"] == "closed"


@patch("routers.admin.supabase")
def test_admin_internship_status_rejects_unknown_status(mock_supabase, admin_client):
    _route_tables(mock_supabase, {"id": "int-1", "status": "active"}, table="internships")
    res = admin_client.post("/api/admin/internships/int-1/status", json={"status": "published"})
    assert res.status_code == 422


@patch("routers.admin.supabase")
def test_admin_internship_status_missing_returns_404(mock_supabase, admin_client):
    _route_tables(mock_supabase, None, table="internships")
    res = admin_client.post("/api/admin/internships/nope/status", json={"status": "closed"})
    assert res.status_code == 404


def test_backend_only_calls_query_methods_that_exist():
    """MagicMock accepts any method, so a JS-style call like .maybeSingle() passes tests but
    crashes in production. Check every chained call after .eq/.select/... exists in postgrest."""
    builders = [
        postgrest.SyncSelectRequestBuilder,
        postgrest.SyncFilterRequestBuilder,
        postgrest.SyncQueryRequestBuilder,
        postgrest.SyncRequestBuilder,
    ]
    known = {name for b in builders for name in dir(b)} | {"execute", "table", "rpc", "from_"}
    backend = Path(__file__).resolve().parents[2]
    bad = []
    for path in list((backend / "routers").glob("*.py")) + list((backend / "services").glob("*.py")):
        text = path.read_text()
        for m in re.finditer(r"supabase\s*\.table\(", text):
            for method in _top_level_chain(text, m.end() - 1):
                if method not in known:
                    bad.append(f"{path.name}: .{method}()")
    assert not bad, f"Unknown postgrest methods: {sorted(set(bad))}"
