from pydantic import BaseModel, ConfigDict
class ParentOrganizationBase(BaseModel):
    name: str
    enable_shared_tokens: bool = False

class ParentOrganizationResponse(ParentOrganizationBase):
    id: int
    enable_shared_tokens: bool = False
    model_config = ConfigDict(from_attributes=True)

class ORMMock:
    def __init__(self):
        self.id = 1
        self.name = "Test"
        self.enable_shared_tokens = True

orm = ORMMock()
response = ParentOrganizationResponse.model_validate(orm)
print("Response enable_shared_tokens:", response.enable_shared_tokens)
