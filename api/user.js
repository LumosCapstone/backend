import {API_RETURN_MESSAGES, ITEM } from './constants.js';

// GET /api/user/:id endpoint
export async function userRoute(req, res, sql) {
  const user_id = parseInt(req.params.id);

  if (isNaN(user_id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric user ID"
    });
  }

  try {
    // Fetch the user
    const [user] = await sql`
      select id, name, email, phone_number
      from users
      where id = ${user_id};
    `;

    // If `!user`, a user under the given ID doesn't exist
    if (!user) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.USER_NOT_FOUND,
        id: user_id
      });
    }

    res.status(200).send(user);

  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
};