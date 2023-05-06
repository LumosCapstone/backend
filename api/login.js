export async function loginRoute(req, res, sql) {
    try {
      const { email, password } = req.body;
  
      if (email == undefined || password == undefined) {
        return res.status(400).send({
          error: "All_PARAMETER_REQUIRED"
        });
      }
  
      const rows = await sql`SELECT * FROM users where email = ${email};`
  
      if (rows.length === 0) {
        return res.status(401).json({ error: 'INVALID_EMAIL_OR_PASSWORD' });
      }
  
      const user = rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'INVALID_EMAIL_OR_PASSWORD' });
      }
  
      const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
      });
      return res.status(200).json({ token, id: user.id });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' });
    }
};