import {API_RETURN_MESSAGES, ITEM } from './constants.js';

// POST /api/item/listing/:id endpoint
export async function listingRoute(req, res, sql) {
  const id = parseInt(req.params.id);
  const user_id = parseInt(req.query.user_id);
  const item_listing = req.query.item_listing;
  let status;

  if (isNaN(id) || isNaN(user_id) || !item_listing) {
    res.status(400).send({
      error: "BAD_REQUEST",
      message: "Please provide a numeric ID, user ID, and all query parameters (user_id, item_listing)"
    });
  }

  status = (item_listing === 'true');

  try {
    // select resource
    const [resource] = await sql`
      select owned_by, reservation_status 
      from resources
      where id = ${id} 
    `;

    // No resource found
    if (!resource) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    } else if (resource.owned_by != user_id) { // user relisting the item must be its owner
      return res.status(401).send({
        error: API_RETURN_MESSAGES.UNAUTHORIZED,
        message: "You are not authorized to perform this action"
      });
    } else if (resource.reservation_status != ITEM.LISTED && resource.reservation_status != ITEM.UNLISTED) { // the item cannot be reserved
      return res.status(403).send({
        error: API_RETURN_MESSAGES.RESERVED,
        message: "Cannot alter the listing of an item that is currently reserved"
      });
    }

    // update resource
    const update_item_listing = await sql`
      update resources
      set reservation_status = ${(status ? ITEM.LISTED : ITEM.UNLISTED)}
      where id = ${id}
    `;

    if (status) {
      return res.status(200).send({
        ok: API_RETURN_MESSAGES.RELISTED,
        id
      });

    } else {
      return res.status(200).send({
        ok: API_RETURN_MESSAGES.UNLISTED,
        id
      });
    }
  }
  catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
};