// POST /api/item/return/:id endpoint
export async function returnRoute(req, res, sql) {
    const id = parseInt(req.params.id);
    const user_id = parseInt(req.query.user_id);
  
    if (isNaN(id) || isNaN(user_id)) {
      return res.status(400).send({
        error: "BAD_REQUEST",
        message: "please provide a numeric user ID and item ID"
      });
    }
  
    try {
      // Select the resource that should be returned
      const [resource] = await sql`
        select id, owned_by, reserved_by, reservation_status
        from resources
        where id = ${id};
      `;
  
      if (!resource) { // No resource found
        return res.status(404).send({
          error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
          id
        });
      } else if (resource.reservation_status != ITEM.CONFIRMED) { // The resource must be confirmed as borrowed
        return res.status(403).send({
          error: API_RETURN_MESSAGES.NOT_BORROWED,
          message: "Cannot return an item that hasn't been borrowed."
        });
      } else if (resource.reserved_by != user_id) { // The user cancelling the reservation has to be the borrower
        return res.status(401).send({
          error: API_RETURN_MESSAGES.UNAUTHORIZED,
          message: "You are not authorized to perform this action."
        });
      }
  
      const _update_result = await sql`
        update resources
        set reservation_status = ${ITEM.UNLISTED}, reserved_by = NULL where id = ${id};
      `;
  
      res.status(200).send({
        ok: API_RETURN_MESSAGES.RESOURCE_RETURNED,
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