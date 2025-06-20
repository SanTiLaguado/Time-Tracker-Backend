-- --------------------------------------------------
-- 1. users table
-- --------------------------------------------------
CREATE TABLE users (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100)     NOT NULL,
  email             VARCHAR(255)     NOT NULL UNIQUE,
  password          VARCHAR(255)     NOT NULL,
  role              ENUM('admin','user') DEFAULT 'user',
  active            BOOLEAN          NOT NULL DEFAULT TRUE,
  failed_attempts   INT UNSIGNED     NOT NULL DEFAULT 0,
  last_failed_at    DATETIME         NULL,
  last_login_at     DATETIME         NULL,
  created_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP        NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP
);

-- --------------------------------------------------
-- 2. time_entries table
-- --------------------------------------------------
CREATE TABLE time_entries (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  user_id           INT           NOT NULL,
  check_in          DATETIME(3)   NOT NULL,
  check_out         DATETIME(3)   NULL,
  summary           TEXT,
  status            ENUM('PENDING','APPROVED','REJECTED')
                    NOT NULL DEFAULT 'PENDING',
  reviewer_id       INT           NULL,
  created_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,
  -- virtual column to enforce only one open entry per user (MySQL 8+)
  is_open           TINYINT(1) AS (check_out IS NULL) VIRTUAL,
  UNIQUE KEY uq_user_open (user_id, is_open),
  INDEX idx_user_date (user_id, check_in),
  INDEX idx_status    (status),
  CONSTRAINT fk_te_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_te_reviewer
    FOREIGN KEY (reviewer_id)
    REFERENCES users(id)
    ON DELETE SET NULL
);

-- --------------------------------------------------
-- 3. Stored procedures
-- --------------------------------------------------
DELIMITER //

-- 3.1 CreateUser
CREATE PROCEDURE CreateUser(
    IN p_name VARCHAR(100),
    IN p_email VARCHAR(255),
    IN p_password VARCHAR(255),
    IN p_role ENUM('admin','user')
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Error creating user.';
    END;
    
    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already registered.';
    END IF;

    START TRANSACTION;
      INSERT INTO users (name, email, password, role)
      VALUES (p_name, p_email, p_password, p_role);
    COMMIT;
    
    SELECT LAST_INSERT_ID() AS id, p_name AS name, p_email AS email, p_role AS role;
END //

-- 3.2 GetUserByEmail
CREATE PROCEDURE GetUserByEmail(
    IN p_email VARCHAR(255)
)
BEGIN
    SELECT 
      id,
      name,
      email,
      password,
      role,
      active,
      failed_attempts,
      last_failed_at,
      last_login_at
    FROM users
    WHERE email = p_email
      AND active = TRUE;
END //

-- 3.3 UpdateLastLogin
CREATE PROCEDURE UpdateLastLogin(
    IN p_email VARCHAR(255)
)
BEGIN
    UPDATE users
    SET last_login_at = UTC_TIMESTAMP()
    WHERE email = p_email;
    
    SELECT ROW_COUNT() > 0 AS updated;
END //
DELIMITER ;
