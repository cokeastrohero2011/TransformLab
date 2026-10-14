-- D1 limits each BLOB and row to 2 MB, so private files are split into smaller rows.
CREATE TABLE stored_file_chunks (
 file_id TEXT NOT NULL,
 chunk_index INTEGER NOT NULL,
 data BLOB NOT NULL,
 PRIMARY KEY(file_id, chunk_index),
 FOREIGN KEY(file_id) REFERENCES stored_files(id) ON DELETE CASCADE
);
