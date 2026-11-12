-- Everything the demo client received, as it came in.
CREATE TABLE journal (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  query TEXT,
  body TEXT,
  status INTEGER NOT NULL,
  origin TEXT
);

-- Booking sessions the site created before handing the visitor over.
CREATE TABLE sessions (
  token TEXT PRIMARY KEY,
  at TEXT NOT NULL,
  body TEXT NOT NULL
);

-- Bookings confirmed on the client's own booking page.
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  at TEXT NOT NULL,
  via TEXT NOT NULL,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new'
);
