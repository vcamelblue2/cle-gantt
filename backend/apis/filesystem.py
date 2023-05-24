import json, os, sys
import datetime as dt

from ..api_decorator import expose_to_js


class FilesystemController:
	
	@staticmethod
	@expose_to_js()
	def dataFolder():
		return "./data/"

	@staticmethod
	@expose_to_js()
	def readJson(path):
		with open(path, "r") as f: return json.load(f)

	@staticmethod
	@expose_to_js()
	def writeJson(path, content, mode='w'):
		with open(path, mode) as f: 
			json.dump(content, f)
			return True