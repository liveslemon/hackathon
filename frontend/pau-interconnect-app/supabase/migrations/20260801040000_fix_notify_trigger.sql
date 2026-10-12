DROP TRIGGER IF EXISTS trg_notify_employer_on_application ON applied_internships;

CREATE OR REPLACE FUNCTION notify_employer_on_application()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, link, metadata)
  SELECT
    i.employer_id,
    'new_application',
    'New Application Received',
    (SELECT full_name FROM profiles WHERE id = NEW.user_id) || ' applied for ' || i.role,
    '/dashboard/employer/internships/' || NEW.internship_id,
    jsonb_build_object('application_id', NEW.id, 'internship_id', NEW.internship_id)
  FROM internships i WHERE i.id = NEW.internship_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_notify_employer_on_application
AFTER INSERT ON applied_internships
FOR EACH ROW EXECUTE FUNCTION notify_employer_on_application();
