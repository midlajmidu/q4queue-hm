from pydantic import BaseModel, Field
class ParentOrganizationUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    enable_shared_tokens: bool = False

print("Sending true:", ParentOrganizationUpdate(enable_shared_tokens=True).model_dump(exclude_unset=True))
print("Sending false:", ParentOrganizationUpdate(enable_shared_tokens=False).model_dump(exclude_unset=True))
print("Sending dict true:", ParentOrganizationUpdate.model_validate({"enable_shared_tokens": True}).model_dump(exclude_unset=True))
print("Sending dict false:", ParentOrganizationUpdate.model_validate({"enable_shared_tokens": False}).model_dump(exclude_unset=True))
