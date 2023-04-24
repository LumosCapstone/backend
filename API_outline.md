# Lumos Broker API Outline

## GET /api/item?lat=float&long=float&max_distance=unsigned_int&type=string

Gets a list of `type` items within `max_distance` of (`lat`, `long`)

- `lat` (float) user's latitude
- `long` (float) user's longitude
- `max_distance` (unsigned integer) list items no more than this distance (in miles) away from the user
- `type` (string) the type of resource to filter by

### Example response (subject to change as we develop DB schema)

```json
[
  {
    "id": 123,
    "name": "Freezer space",
    "type": "fridge_space",
    "quantity": 2,
    "seller": "Bob Smith",
    "distance": "< 5 miles",
    "image": "url or image data"
  }
]
```

## GET /api/item/:id

Gets detailed information about an item. Returns an error if the item has been reserved.

- `:id` the item's ID

### Example response (subject to change as we develop DB schema)

```json
{
  "id": 123,
  "name": "Freezer space",
  "type": "fridge_space",
  "quantity": 1,
  "seller": "Bob Smith",
  "seller_email": "bob@gmail.com",
  "seller_phone": "+1 (123) 123-1234",
  "images": ["url or image data 1", "url or image data 2"]
}
```

### Example error response

```json
{
  "error": "ITEM_UNAVAILABLE",
  "id": 123
}
```

## POST /api/item/reserve/:id?user_id=int

Attempts to reserve an item for the user. May return an error if the item is unavailable.
The owner of the resource must follow-up to confirm the reserver is using their resource
(see POST /api/item/confirm-reservation/:id?user_id=int), or cancel the reservation if the
exchange doesn't work out.

- `:id` the item's ID
- `user_id` the user ID of the reserver

### Example response (subject to change as we develop DB schema)

```json
{
  "ok": "RESERVE_SUCCESS",
  "seller": "Bob Smith",
  "seller_email": "bob@gmail.com",
  "seller_phone": "+1 (123) 123-1234",
  "id": 123
}
```

### Example error response

```json
{
  "error": "ITEM_UNAVAILABLE",
  "id": 123
}
```

## POST /api/item/confirm-reservation/:id?user_id=int

Used by resource owners to confirm that a reserver has followed-through
with their reservation and is now using the resource.

- `:id` the item's ID
- `user_id` the user ID of the reserver

### Example response (subject to change as we develop DB schema)

```json
{
  "ok": "CONFIRMED_RESERVATION",
  "id": 123
}
```

### Example error responses

```json
{
  "error": "ITEM_UNAVAILABLE",
  "id": 123
}
```

The `error` key can be one of `BAD_REQUEST`, `ITEM_UNAVAILABLE`, `NO_RESERVATION`, `INTERNAL_SERVER_ERROR`

## POST /api/item/cancel-reservation/:id?user_id=int?relist=boolean

Used by resource owners to cancel a reservation, and potentially
re-list the resource for others to reserve.

- `:id` the item's ID
- `user_id` the user ID of the reserver
- `relist` whether to relist the item for reservation. Defaults to false

### Example response (subject to change as we develop DB schema)

```json
{
  "ok": "CANCELED_RESERVATION",
  "id": 123
}
```

### Example error response

```json
{
  "error": "ITEM_UNAVAILABLE",
  "id": 123
}
```

The `error` key can be one of `BAD_REQUEST`, `ITEM_UNAVAILABLE`, `NO_RESERVATION`, `INTERNAL_SERVER_ERROR`

## POST /api/item/return/:id?user_id=int

Used by resource borrowers to return a resource.

- `:id` the item's ID
- `user_id` the user ID of the reserver

### Example response

```json
{
  "ok": "RESOURCE_RETURNED",
  "id": 123
}
```

### Example error response

```json
{
  "error": "ITEM_UNAVAILABLE",
  "id": 123
}
```

The `error` key can be one of `BAD_REQUEST`, `ITEM_UNAVAILABLE`, `UNAUTHORIZED`, `NOT_BORROWED`, `INTERNAL_SERVER_ERROR`

## POST /api/item/listing/:id?user_id=int&list=boolean

Used by resource owners to list or unlist their items

- `:id` the item's ID
- `user_id` user ID of the owner
- `list` whether to list, or unlist the item

### Example response

```json
{
  "ok": "ITEM_UNLISTED",
  "id": 123
}
```

### Example error response

```json
{
  "error": "ITEM_UNAVAILABLE",
}
```

The `error` can be one of `BAD_REQUEST`, `ITEM_UNAVAILABLE`, `UNAUTHORIZED`, `RESERVED`, `INTERNAL_SERVER_ERROR`

## GET /api/user/:id

Gets a user by ID

- `:id` the user's ID

### Example response

```json
{
  "id": 123,
  "name": "john smith",
  "email": "j.smith@example.com",
  "phone_number": null
}
```

### Example error response

```json
{
  "error": "USER_NOT_FOUND",
  "id": 123
}
```

The `error` key can be one of `BAD_REQUEST` or `USER_NOT_FOUND`