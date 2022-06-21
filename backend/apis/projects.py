import json, os, sys

from ..api_decorator import expose_to_js

base_path = os.path.dirname(sys.executable)
print("base path", base_path)
db_path = base_path+"/data/db.json"
print("db path", db_path)

class ProjectsModel:
	def __init__(self, auto_init=True):
		if auto_init:
			self._load()
	
	def _load(self):
		print("load")

		try: 
			with open(db_path, "r") as f:
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

			if not os.path.exists(db_path):
				self._store()
			else:
				raise Exception("Erro During Model Init")

	def _store(self):
		print("store")

		with open(db_path, "w") as f:
			db = {'task_id_gen': self.task_id_gen, 'projects': self.projects}
			json.dump(db, f)


model = ProjectsModel(True)


def Find(arr, condition): return list(filter(condition, arr))[0]
def Filter(arr, condition): return list(filter(condition, arr))
def Map(arr, condition): return list(map(condition, arr))

class ProjectsController:
    
	@staticmethod
	@expose_to_js()
	def getProjects():
		return list(map(lambda p: {"id": p['id'], "name": p['name']}, model.projects))

	@staticmethod
	@expose_to_js()
	def getProject(id='p0'):
		return list(filter(lambda p: p['id']==id, model.projects))[0]

	@staticmethod
	@expose_to_js()
	def editActivity(project_id, activity, edits):
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])

		activity_ptr['name']=edits['name']
		activity_ptr['color']=edits['color']
		activity_ptr['start']=edits['start']
		activity_ptr['len']=edits['len']

		model._store()
		return activity_ptr
	

	@staticmethod
	@expose_to_js()
	def addActivity(project_id, activity):
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		
		model.task_id_gen+=1
		proj_ptr['activities'].append({**activity, 'id': "task"+str(model.task_id_gen), 'subtasks':[]})

		model._store()
		return {}


	@staticmethod
	@expose_to_js()
	def deleteActivity(project_id, activity_id):
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		proj_ptr['activities'] = Filter(proj_ptr['activities'], lambda a: a['id'] != activity_id)
		
		model._store()
		return {}
	

	@staticmethod
	@expose_to_js()
	def moveActivityUp(project_id, activity_idx):
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		if activity_idx == 0:
			raise Exception("cannot move up")

		proj_ptr['activities'][activity_idx-1], proj_ptr['activities'][activity_idx] = proj_ptr['activities'][activity_idx], proj_ptr['activities'][activity_idx-1]

		model._store()
		return {'new_idx': activity_idx-1}

	@staticmethod
	@expose_to_js()
	def moveActivityDown(project_id, activity_idx):
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		if activity_idx == len(proj_ptr['activities'])-1:
			raise Exception("cannot move down")

		proj_ptr['activities'][activity_idx+1], proj_ptr['activities'][activity_idx] = proj_ptr['activities'][activity_idx], proj_ptr['activities'][activity_idx+1]
	
		model._store()
		return {'new_idx': activity_idx+1}
	

	@staticmethod
	@expose_to_js()
	def moveActivityLeft(project_id, activity):
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		if activity_ptr['start'] == 0:
			raise Exception("cannot move left")

		activity_ptr['start'] -= 1
		
		model._store()
		return {'new_start': activity_ptr['start']}

	@staticmethod
	@expose_to_js()
	def moveActivityRight(project_id, activity):
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
	
		activity_ptr['start'] += 1

		model._store()
		return {'new_start': activity_ptr['start']}
    

	@staticmethod
	@expose_to_js()
	def incrementActivityLen(project_id, activity):
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		activity_ptr['len'] += 1

		model._store()
		return {'new_len': activity_ptr['len']}
	

	@staticmethod
	@expose_to_js()
	def decrementActivityLen(project_id, activity):
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		if activity_ptr['len'] == 0:
			raise Exception("cannot move left")
		
		activity_ptr['len'] -= 1

		model._store()
		return {'new_len': activity_ptr['len']}
	

	@staticmethod
	@expose_to_js()
	def editSubTasks(project_id, activity, subTasks):
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		activity_ptr['subtasks'] = subTasks

		model._store()
		return {}
	

	@staticmethod
	@expose_to_js()
	def editSubTask(project_id, activity, subTask, edits):
		subtask_ptr = Find(Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])['subtasks'], lambda s: s['idx']==subTask['idx'])
		subtask_ptr['idx'] = edits['idx']
		subtask_ptr['name'] = edits['name']
		subtask_ptr['description'] = edits['description']

		model._store()
		return {}
	