
-- Database 'alexuser.db'

BEGIN TRANSACTION;

CREATE TABLE IF NOT EXISTS `self` (
    `user_id` INTEGER PRIMARY KEY NOT NULL,
    `state_id` INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS `states` (
    `state_id` INTEGER PRIMARY KEY NOT NULL,
    `text` TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS `events` (
    `event_id` VARCHAR(16) PRIMARY KEY,
    `event_name` TEXT NOT NULL,
    `creation_date` DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS `meetings` (
    `meeting_id` INTEGER PRIMARY KEY AUTOINCREMENT,
    `person_id` INTEGER NOT NULL,
    `time_start` DATETIME NOT NULL,
    `time_end` DATETIME
);

INSERT INTO `states` (`state_id`, `text`) VALUES
    (0, 'Alles in Ordnung! Bitte beachte die aktuellen Verordnungen zu deiner eigenen Sicherheit.'),
    (1, 'Du hattest möglicherweise Kontakt mit infizierten Personen. Bitte halte dich von Risikogruppen fern und mache einen Test.'),
    (2, 'Du hattest längeren Kontakt mit infizierten Personen. Bitte begebe dich in Quarantäne und mache einen Test.'),
    (3, 'Dein Testergebnis war positiv. Bitte bleibe in Quarantäne!'),
    (4, 'Dein Testergebnis war negativ. Beachte bitte weiterhin die bestehenden Regelungen!');

COMMIT;
