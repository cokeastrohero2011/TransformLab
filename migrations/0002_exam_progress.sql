ALTER TABLE exam_answers ADD COLUMN completed_at TEXT;
CREATE INDEX exam_answers_completed_idx ON exam_answers(completed_at DESC);
CREATE TRIGGER exam_stats_insert AFTER INSERT ON exam_answers BEGIN
 INSERT INTO transformation_stats(transformation_type,questions_attempted,questions_correct,marks_awarded,marks_available)
 VALUES(json_extract(NEW.question_data,'$.type'),1,CASE WHEN NEW.marks_awarded=NEW.maximum_marks THEN 1 ELSE 0 END,NEW.marks_awarded,NEW.maximum_marks)
 ON CONFLICT(transformation_type) DO UPDATE SET
 questions_attempted=questions_attempted+1,
 questions_correct=questions_correct+CASE WHEN NEW.marks_awarded=NEW.maximum_marks THEN 1 ELSE 0 END,
 marks_awarded=marks_awarded+NEW.marks_awarded,
 marks_available=marks_available+NEW.maximum_marks;
END;
