// POST /api/item/cancel-reservation/:id endpoint
export async function cancelRoute (req, res) {
    const id = parseInt(req.params.id);
    const user_id = parseInt(req.query.user_id);
    let relist = req.query.relist;
  
    if (isNaN(id) || isNaN(user_id)) {
      return res.status(400).send({
        error: "BAD_REQUEST",
        message: "please provide a numeric user ID and item ID"
      });
    }
  
    try {
      // Select the resource whose reservation should be cancelled
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
      } else if (![resource.owned_by, resource.reserved_by].includes(user_id)) { // The user cancelling the reservation has to be the owner or the reserver
        return res.status(401).send({
          error: API_RETURN_MESSAGES.UNAUTHORIZED,
          message: "You are not authorized to perform this action."
        });
      } else if (resource.reservation_status != ITEM.RESERVED && resource.reservation_status != ITEM.CONFIRMED) { // The resource must have an unconfirmed reservation to cancel
        return res.status(403).send({
          error: API_RETURN_MESSAGES.NO_RESERVATION,
          message: "No reservation to cancel."
        });
      }
  
      // `relist` query param defaults to false
      if (relist == undefined) relist = false;
  
      const _update_result = await sql`
        update resources 
        set reservation_status = ${relist ? ITEM.LISTED : ITEM.UNLISTED}, reserved_by = NULL where id = ${id};
      `;
  
      res.status(200).send({
        ok: API_RETURN_MESSAGES.RESERVE_CANCELLATION_SUCCESS,
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