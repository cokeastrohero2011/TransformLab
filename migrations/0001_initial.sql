CREATE TABLE practice_questions (
 id TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK(mode IN ('identify','draw','parameter','combined')),
 difficulty TEXT NOT NULL, transformation_type TEXT NOT NULL, public_data TEXT NOT NULL,
 solution_data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX practice_questions_created_idx ON practice_questions(created_at);
CREATE TABLE practice_attempts (
 id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE, question_id TEXT NOT NULL,
 question_data TEXT NOT NULL, transformation_type TEXT NOT NULL, submitted_answer TEXT NOT NULL,
 correct_answer TEXT NOT NULL, marks_awarded INTEGER NOT NULL, maximum_marks INTEGER NOT NULL,
 mistake_category TEXT, feedback TEXT NOT NULL, time_spent_seconds INTEGER NOT NULL DEFAULT 0,
 completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(question_id) REFERENCES practice_questions(id)
);
CREATE INDEX practice_attempts_completed_idx ON practice_attempts(completed_at DESC);
CREATE INDEX practice_attempts_type_idx ON practice_attempts(transformation_type);
CREATE TABLE transformation_stats (
 transformation_type TEXT PRIMARY KEY, questions_attempted INTEGER NOT NULL DEFAULT 0,
 questions_correct INTEGER NOT NULL DEFAULT 0, marks_awarded INTEGER NOT NULL DEFAULT 0,
 marks_available INTEGER NOT NULL DEFAULT 0
);
CREATE TRIGGER practice_stats_insert AFTER INSERT ON practice_attempts BEGIN
 INSERT INTO transformation_stats(transformation_type,questions_attempted,questions_correct,marks_awarded,marks_available)
 VALUES(NEW.transformation_type,1,CASE WHEN NEW.marks_awarded=NEW.maximum_marks THEN 1 ELSE 0 END,NEW.marks_awarded,NEW.maximum_marks)
 ON CONFLICT(transformation_type) DO UPDATE SET
 questions_attempted=questions_attempted+1,
 questions_correct=questions_correct+CASE WHEN NEW.marks_awarded=NEW.maximum_marks THEN 1 ELSE 0 END,
 marks_awarded=marks_awarded+NEW.marks_awarded,
 marks_available=marks_available+NEW.maximum_marks;
END;
CREATE TABLE exam_sessions (
 id TEXT PRIMARY KEY, started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, completed_at TEXT,
 duration_seconds INTEGER, total_marks INTEGER NOT NULL, marks_awarded INTEGER,
 status TEXT NOT NULL DEFAULT 'in_progress' CHECK(status IN ('in_progress','completed')),
 difficulty TEXT NOT NULL
);
CREATE INDEX exam_sessions_started_idx ON exam_sessions(started_at DESC);
CREATE TABLE exam_questions (
 id TEXT PRIMARY KEY, exam_session_id TEXT NOT NULL, position INTEGER NOT NULL,
 question_data TEXT NOT NULL, solution_data TEXT NOT NULL, maximum_marks INTEGER NOT NULL,
 FOREIGN KEY(exam_session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
 UNIQUE(exam_session_id,position)
);
CREATE TABLE exam_answers (
 id TEXT PRIMARY KEY, exam_session_id TEXT NOT NULL, exam_question_id TEXT NOT NULL,
 idempotency_key TEXT NOT NULL UNIQUE, question_data TEXT NOT NULL, submitted_answer TEXT NOT NULL,
 marks_awarded INTEGER NOT NULL, maximum_marks INTEGER NOT NULL, feedback TEXT NOT NULL,
 time_spent_seconds INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(exam_session_id) REFERENCES exam_sessions(id) ON DELETE CASCADE,
 FOREIGN KEY(exam_question_id) REFERENCES exam_questions(id), UNIQUE(exam_question_id)
);
CREATE TABLE saved_visualizations (
 id TEXT PRIMARY KEY, title TEXT NOT NULL, shape_data TEXT NOT NULL,
 transformation_data TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX saved_visualizations_created_idx ON saved_visualizations(created_at DESC);
CREATE TABLE stored_files (
 id TEXT PRIMARY KEY, object_key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL,
 content_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, kind TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
