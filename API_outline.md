# Lumos Broker API Outline

## GET /api/item?lat=float&long=float&max_distance=unsigned_int

Gets a list of items within a certain `max_distance` of `lat` and `long`

- `lat` (float) user's latitude
- `long` (float) user's longitude
- `max_distance` (unsigned integer) list items no more than this distance (in miles) away from the user

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

Attempts to reserve an item for the user. May return an

- `:id` the item's ID
- `user_id` the user ID of the reserver

### Example response (subject to change as we develop DB schema)

```json
{
  "ok": "RESERVE_SUCCESS",
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
