import {API_RETURN_MESSAGES, ITEM } from './constants.js';

// POST /api/item/confirm-reservation/:id endpoint
export async function confirmRoute(req, res, sql) {
    const id = parseInt(req.params.id);
    const user_id = parseInt(req.query.user_id);
  
    if (isNaN(id) || isNaN(user_id)) {
      return res.status(400).send({
        error: "BAD_REQUEST",
        message: "please provide a numeric user ID and item ID"
      });
    }
  
    try {
      // Select the resource whose reservation should be confirmed
      const [resource] = await sql`
        select id, owned_by, reservation_status
        from resources
        where id = ${id};
      `;
  
      if (!resource) { // No resource found
        return res.status(404).send({
          error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
          id
        });
      } else if (resource.owned_by != user_id) { // The user confirming the reservation has to be the owner
        return res.status(401).send({
          error: API_RETURN_MESSAGES.UNAUTHORIZED,
          message: "You are not authorized to perform this action."
        });
      } else if (resource.reservation_status != ITEM.RESERVED) { // The resource must have a reservation to confirm
        return res.status(403).send({
          error: API_RETURN_MESSAGES.NO_RESERVATION,
          message: "No reservation to confirm."
        });
      }
  
      const _update_result = await sql`
        update resources 
        set reservation_status = ${ITEM.CONFIRMED} where id = ${id};
      `;
  
      res.status(200).send({
        ok: API_RETURN_MESSAGES.RESERVE_CONFIRMATION_SUCCESS,
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