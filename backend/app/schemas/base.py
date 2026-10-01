"""
Schema helper: camelCase JSON wire format.

FUNCTIONALITY:
    The frontend's mock data objects use JavaScript camelCase keys
    (src/data/store.js: employeeId, firstReplyAt, closedBy, updatedAt...).
    Python convention is snake_case, so this base class aliases every field
    to its camelCase name on the way out and accepts both forms on the way
    in — meaning the React code can consume the API responses with zero
    reshaping and can keep sending whatever its forms already produce.

    Example: class field `employee_id` is serialized as "employeeId".
"""

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,   # accept both employeeId and employee_id on input
        from_attributes=True,    # so ORM rows can validate directly with from_orm
    )
