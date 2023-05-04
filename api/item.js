// GET /api/item endpoint
export async function item_list(req, res) {
  // Get query parameters
  const { type, lat, long, max_distance } = req.query;

  if (!lat || !long || !max_distance) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "Please provide all required query parameters (max_distance, lat, and long)"
    });
  }

  // max distance needs to be a positive number
  if (max_distance < 1) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "max_distance cannot be less than 1"
    });
  }

  try {
    // Select resources, join owner and one image per resource
    const point = `POINT(${long} ${lat})`;

    const resources = await sql`
     select distinct on (resources.id)
       resources.id, resources.name, type, quantity, users.name as seller, content as image, 
       ${resources_distance_sql(point)}
     from resources 
     left outer join users on users.id = owned_by 
     left outer join images on resource_id = resources.id 
     where reservation_status = ${ITEM.LISTED} and
     ${resources_within_range_sql(point, max_distance, type)}`;

    // If rows are empty, items do not exist. 
    if (resources.length < 1) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
      });
    }

    // Convert the resources' exact distance in meters to an approximation in miles
    for (let resource of resources) {
      resource.distance = metersToDistanceApproximation(resource.distance_meters);
      delete resource.distance_meters;
    }

    res.status(200).send(resources);
  } catch (error) {
    console.error(error);

    res.status(500).send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
};

// GET /api/item/:id endpoint
export async function item_view(req, res) {
  // Parse item ID
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    return res.status(400).send({
      error: "BAD_REQUEST",
      message: "please provide a numeric item ID"
    });
  }

  try {
    // Get the resource
    const [resource] = await sql`
      select resources.id, resources.name, type, quantity, users.name as seller, email as seller_email, phone_number as seller_phone
      from resources left outer join users on users.id = owned_by where resources.id = ${id};`;

    // If undefined, this item doesn't exist
    if (!resource) {
      return res.status(404).send({
        error: API_RETURN_MESSAGES.ITEM_UNAVAILABLE,
        id
      });
    }

    // If we got the resource, select all of its images (can we improve this be one query?)
    const images = await sql`select content from images where resource_id = ${id};`;

    res.send({ ...resource, images: images.map(i => i.content) });
  } catch (error) {
    console.error(error);

    res.send({
      error: API_RETURN_MESSAGES.INTERNAL_SERVER_ERROR,
      message: "Internal Server Error"
    });
  }
};