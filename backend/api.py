from .api_decorator import expose_to_js, RegisteredApi

class HelloDemoController:
	
	@staticmethod
	@expose_to_js()
	def hello():
		print("hello request")
		return "hello"

class ExposedApi_V1(RegisteredApi): pass