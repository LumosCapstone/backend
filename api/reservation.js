// POST /api/item/reserve/:id endpoint
export async function reserveRoute(req, res,sql) {

    // Parse query and URL parameters
    const id = parseInt(req.params.id);
    const user_id = parseInt(req.query.user_id);
    if (isNaN(id) || isNaN(user_id)) {
      return res.status(400).send({
        error: "BAD_REQUEST",
        message: "please provide a numeric user ID and item ID"
      });
    }
  
    try {
      // Get the item, but only if it is currently reserved
      const items = await sql`
        select owned_by
        from resources
        where id = ${id} and reservation_status in (${ITEM.RESERVED}, ${ITEM.CONFIRMED});
      `;
  
      // If we get rows back, the item is already reserved
      if (items.length > 0) {
        return res.status(409).send({
          error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
          id
        });
      }
  
      // TODO: Could probably reduce this from 3 -> 2 queries by joining seller info on the resources select above.
      const [owner] = await sql`
        select name as seller, email as seller_email, phone_number as seller_phone 
        from users
        where id = ${user_id};
      `;
  
      if (!owner) {
        console.error(`Tried to reserve resource with unknown owner/user_id: ${user_id}`);
  
        return res.status(500).send({
          error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
          message: "Internal Server Error"
        });
      }
  
      // If we got no rows back, update the item to be reserved by `user_id`
      const _ = await sql`update resources 
        set reserved_by = ${user_id}, reservation_status = ${ITEM.RESERVED} where id = ${id}`;
  
      res.status(200).send({
        ok: API_RETURN_MESSAGES.RESERVE_SUCCESS,
        seller: owner.seller,
        seller_email: owner.seller_email,
        seller_phone: owner.seller_phone,
        id
      });
    } catch (error) {
      console.error(error);
  
      res.status(500).send({
        error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
        message: "Internal Server Error"
      });
    }
 };