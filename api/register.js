const express = require("express");
const router = express.Router();

router.post('/api/register', async (req, res) => {
    var { name, email, phone_number, password } = req.body;
  
    if (!email || !name || !password) {
      res.status(400).json({ error: 'All_FIELDS_ARE_REQUIRED' });
      return;
    }
  
    if (phone_number && phone_number.length != 10) {
      res.status(400).json({ error: 'INVALID_PHONE_NUMBER' });
      return;
    } else if (phone_number == undefined) {
      phone_number = ""
    }
  
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'INVALID_EMAIL' });
      return;
    }
  
    try {
      const existingUser = await sql`
        SELECT * FROM users
        WHERE email = ${email}
        LIMIT 1
      `;
  
      if (existingUser.length > 0) {
        res.status(400).json({
          "error": "EMAIL_ALREADY_REGISTERED",
          "email": email
        })
        return;
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
      await sql`
        INSERT INTO users (name,email,password_hash, phone_number)
        VALUES (${name}, ${email}, ${hashedPassword}, ${phone_number})
      `;
  
      res.status(200).json({
        ok: "REGISTERED_SUCCESFULLY"
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "INTERNAL_SERVER_ERROR" })
    }
});

module.exports = router;