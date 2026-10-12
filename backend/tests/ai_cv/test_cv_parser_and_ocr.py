import pytest
from unittest.mock import AsyncMock, patch

from routers.cv import clean_cv_text, sanitize_filename
from services.cv_ocr_service import ocr_pdf, _render_pages
from services.cv_parser_service import parse_cv_structured, compute_structured_match


def test_clean_cv_text():
    """Verify control chars, null bytes, and excessive whitespace are stripped."""
    assert clean_cv_text("") == ""
    assert clean_cv_text(None) == ""
    dirty = "John Doe\x00\x08\x0bSoftware Engineer\n\n\n\nPython   Developer\t\tRemote"
    cleaned = clean_cv_text(dirty)
    assert "\x00" not in cleaned
    assert "\x08" not in cleaned
    assert "\n\n\n" not in cleaned
    assert "John Doe" in cleaned
    assert "Software Engineer" in cleaned
    assert "Python Developer" in cleaned


def test_sanitize_filename():
    """Verify path traversal sequences and dangerous characters are sanitized."""
    assert sanitize_filename("../../etc/passwd") == "passwd"
    assert sanitize_filename("..\\..\\windows\\system32\\cmd.exe") == "cmd.exe"
    assert sanitize_filename("my resume (1) [final]!.pdf") == "my_resume__1___final__.pdf"
    assert sanitize_filename("") == "cv.pdf"
    # Long filename capped to 100 chars
    long_name = "a" * 200 + ".pdf"
    assert len(sanitize_filename(long_name)) <= 100


def test_ocr_render_pages_handles_corrupt_data():
    """Verify _render_pages returns empty list instead of crashing on corrupt bytes."""
    corrupt_bytes = b"Not a valid pdf at all"
    pages = _render_pages(corrupt_bytes, max_pages=3)
    assert pages == []


@pytest.mark.anyio
async def test_ocr_pdf_returns_empty_on_unreadable():
    """Verify ocr_pdf returns empty string when OCR fails or renders 0 pages."""
    with patch("services.cv_ocr_service._render_pages", return_value=[]):
        res = await ocr_pdf(b"corrupt")
        assert res == ""


SAMPLE_CV_TEXT = (
    "Sample CV text for a Pan-Atlantic University software engineering student "
    "with extensive experience in cloud computing and web development."
)


@pytest.mark.anyio
async def test_parse_cv_structured_parses_json():
    """Verify parse_cv_structured parses raw JSON into dict."""
    raw_llm_json = """{
        "summary": "Motivated software engineer with experience in cloud systems.",
        "skills": {
            "technical": ["Python", "FastAPI", "PostgreSQL"],
            "soft": ["Communication", "Teamwork"],
            "tools": ["Docker", "Git"]
        },
        "experience": [
            {
                "title": "Software Intern",
                "organization": "Tech Corp",
                "duration": "6 months",
                "highlights": ["Built REST APIs"]
            }
        ],
        "education": {
            "degree": "B.Sc. Computer Science",
            "institution": "Pan-Atlantic University",
            "year": "2025"
        },
        "projects": [
            {
                "name": "E-commerce API",
                "technologies": ["FastAPI", "Stripe"]
            }
        ],
        "certifications": ["AWS Certified Cloud Practitioner"]
    }"""

    with patch("services.cv_parser_service.generate_completion", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = raw_llm_json
        parsed = await parse_cv_structured(SAMPLE_CV_TEXT)

        assert isinstance(parsed, dict)
        assert parsed["summary"] == "Motivated software engineer with experience in cloud systems."
        assert "Python" in parsed["skills"]["technical"]
        assert len(parsed["experience"]) == 1
        assert parsed["education"]["institution"] == "Pan-Atlantic University"


@pytest.mark.anyio
async def test_parse_cv_structured_handles_markdown_fences():
    """Verify parse_cv_structured strips ```json code fences cleanly."""
    fenced_json = """```json
    {
        "summary": "Student developer.",
        "skills": {"technical": ["React", "TypeScript"]},
        "experience": [],
        "education": {},
        "projects": [],
        "certifications": []
    }
    ```"""

    with patch("services.cv_parser_service.generate_completion", new_callable=AsyncMock) as mock_llm:
        mock_llm.return_value = fenced_json
        parsed = await parse_cv_structured(SAMPLE_CV_TEXT)

        assert isinstance(parsed, dict)
        assert parsed["summary"] == "Student developer."
        assert "React" in parsed["skills"]["technical"]


@pytest.mark.anyio
async def test_parse_cv_structured_fallback_on_invalid_llm_output():
    """Verify parse_cv_structured returns schema defaults when LLM produces invalid output."""
    invalid_outputs = [
        "I am an AI and I cannot parse this CV.",
        "{ malformed json string missing closing brace",
        "['unexpected list instead of dict']",
        "",
    ]

    for bad_output in invalid_outputs:
        with patch("services.cv_parser_service.generate_completion", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = bad_output
            parsed = await parse_cv_structured(SAMPLE_CV_TEXT)

            assert isinstance(parsed, dict)
            assert "skills" in parsed
            assert "experience" in parsed
            assert "education" in parsed
            assert "projects" in parsed
            assert "certifications" in parsed
            assert isinstance(parsed["skills"], dict)
            assert isinstance(parsed["experience"], list)


def test_compute_structured_match_empty_inputs_safe():
    """Verify compute_structured_match protects against ZeroDivisionError on empty skills."""
    empty_student = {"skills": {}, "experience": [], "education": []}
    empty_job = {"skills": [], "requirements": []}

    result = compute_structured_match(empty_student, empty_job)
    assert isinstance(result, dict)
    assert "score" in result
    assert isinstance(result["score"], (int, float))
    assert 0 <= result["score"] <= 100


def test_compute_structured_match_scoring():
    """Verify compute_structured_match calculates overlap properly."""
    student_cv = {
        "skills": {
            "technical": ["Python", "Docker", "PostgreSQL", "FastAPI"],
            "soft": ["Communication"],
            "tools": ["Git"],
        },
        "experience": [
            {"title": "Backend Intern", "highlights": ["Built APIs in Python"]}
        ],
        "education": [{"degree": "B.Sc. Computer Science"}],
    }
    job_reqs = {
        "required_skills": ["Python", "FastAPI", "Docker"],
        "nice_to_have_skills": ["PostgreSQL"],
        "domain": "software development",
    }

    result = compute_structured_match(student_cv, job_reqs)
    assert isinstance(result, dict)
    assert result["score"] >= 50
    assert result["score"] <= 100
