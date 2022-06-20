import json, os

from ..api_decorator import expose_to_js

class ProjectsModel:
	def __init__(self, auto_init=True):
		if auto_init:
			self._load()
	
	def _load(self):
		print("load")

		try: 
			with open("./data/db.json", "r") as f:
				db = json.load(f)
				self.task_id_gen = db['task_id_gen']
				self.projects = db['projects']
		except:
			self.task_id_gen = 4
			self.projects =  [{ 
				"id": "p0",
				"name": "Proj 1",
				"startDate": "2022-06-01",
				"activities": [
					{ "id": "task1", "name": "Task 1", "color": "green", "start": 0, "len": 30, "subtasks": [{"idx": 20, "name": "M", "description":""}]},
					{ "id": "task2", "name": "Task 2", "color": "green", "start": 15, "len": 30, "subtasks": []},
					{ "id": "task3", "name": "Task 3", "color": "green", "start": 30, "len": 45, "subtasks": []}
				]
			}]

			if not os.path.exists("./data/db.json"):
				self._store()
			else:
				raise Exception("Erro During Model Init")

	def _store(self):
		print("store")

		with open("./data/db.json", "w") as f:
			db = {'task_id_gen': self.task_id_gen, 'projects': self.projects}
			json.dump(db, f)


model = ProjectsModel(True)


class ProjectsController:
    
	@staticmethod
	@expose_to_js()
	def getProjects():
		return list(map(lambda p: {"id": p['id'], "name": p['name']}, model.projects))

	@staticmethod
	@expose_to_js()
	def getProject(self, id='p0'):
		return list(filter(lambda p: p['id']==id, model.projects))[0]