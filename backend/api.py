from .api_decorator import RegisteredApi
from .apis.projects import ProjectsController
from .apis.filesystem import FilesystemController

class ExposedApi_V1(RegisteredApi): pass