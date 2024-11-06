import json, os, sys
import datetime as dt

from ..api_decorator import expose_to_js

# base_path = os.path.dirname(sys.executable)
# print("base path", base_path)
# db_path = base_path+"/data/db.json"
# print("db path", db_path)


db_path = "./data/db.json"
db_backup_path = "./data/db_backup_{}.json"
current_db_version = 3
sould_reload_delta = 5 * 60 * 1000 # 5 min

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
				self.db_version = db.get('db_version', 1)

				if self.db_version != current_db_version:
					self.migrate(self.db_version, current_db_version)
		except:
			self.task_id_gen = 4
			self.db_version = current_db_version
			self.projects =  [{ 
				"id": "p0",
				"name": "Proj 1",
				"startDate": "2022-06-01",
				"activities": [
					{ "id": "task1", "name": "Task 1", "color": "green", "start": 0, "len": 30, "subtasks_default_color": "orange", "subtasks": [{"idx": 20, "name": "M", "description":"", "custom_color": '', 'todos': [{"done": False, "text": '', "created_on": 0, "tags": ['vivi'], "estimated": 0, "priority": 10, "due_to": 0},]}]},
					{ "id": "task2", "name": "Task 2", "color": "green", "start": 15, "len": 30, "subtasks_default_color": "orange", "subtasks": []},
					{ "id": "task3", "name": "Task 3", "color": "green", "start": 30, "len": 45, "subtasks_default_color": "orange", "subtasks": []}
				]
			}]

			try: 
				os.mkdir(os.path.dirname(db_path))
				print("CREATED DATA FOLDER IN: ", db_path)
			except: pass

			if not os.path.exists(db_path):
				self._store()
			else:
				print("TRY PATH", db_path)
				raise Exception("Erro During Model Init")

		self.last_load = dt.datetime.now()
	

	def _store(self):
		print("store")

		with open(db_path, "w") as f:
			db = {'task_id_gen': self.task_id_gen, 'projects': self.projects, 'db_version': self.db_version}
			json.dump(db, f)

	def _store_backup(self):
		print("store backup")
		
		fpath = db_backup_path.format(dt.datetime.now().strftime("%Y_%m_%d_%H_%M_%S"))

		with open(fpath, "w") as f:
			db = {'task_id_gen': self.task_id_gen, 'projects': self.projects, 'db_version': self.db_version}
			json.dump(db, f)
		
		return fpath
	
	def migrate(self, migration_from, migration_to):

		def migration_1_to_2():
			for project in self.projects:
				for activity in project.get('activities'):
					for subtask in activity.get('subtasks'):
						if 'todos' not in subtask:
							subtask['todos'] = []
		
		def migration_2_to_3():
			for project in self.projects:
				for activity in project.get('activities'):
					if 'subtasks_default_color' not in activity:
						activity['subtasks_default_color'] = 'orange'
					for subtask in activity.get('subtasks'):
						if 'custom_color' not in subtask:
							subtask['custom_color'] = ''
		
		migrations = {
			"1 -> 2": migration_1_to_2,
			"2 -> 3": migration_2_to_3,
		}

		curr_migr_version = migration_from

		print("Migration required!", migration_from, "->", migration_to)

		for next_migration_to in range(migration_from+1, migration_to+1):
			next_migr_func = migrations.get(f'{curr_migr_version} -> {next_migration_to}', None)
			
			print("Migrating", f'{curr_migr_version} -> {next_migration_to}', '...')

			if next_migr_func is not None:
				self._store_backup()
				try:
					next_migr_func()
					print("Migrated", f'{curr_migr_version} -> {next_migration_to}', '!')
					self.db_version = curr_migr_version+1
					self._store()
					print("Saved Migration", f'{curr_migr_version} -> {next_migration_to}', '!')
					curr_migr_version += 1
				except:
					raise Exception("Migration Failed! Abort")

		print("End Migration ", migration_from, "->", migration_to)

	def should_reload(self):
		return abs( int(dt.datetime.now().timestamp()*1000) - int(self.last_load.timestamp()*1000)) >= sould_reload_delta

model = ProjectsModel(True)


def Find(arr, condition): return list(filter(condition, arr))[0]
def Filter(arr, condition): return list(filter(condition, arr))
def Map(arr, condition): return list(map(condition, arr))

class ProjectsController:
	
	@staticmethod
	@expose_to_js()
	def storeBackup():
		model._store_backup()
		return {}

	@staticmethod
	@expose_to_js()
	def forceReloadData():
		model._load()
		return {}
	
	
	@staticmethod
	@expose_to_js()
	def getLastLoad():
		return int(model.last_load.timestamp()*1000)
	
	@staticmethod
	@expose_to_js()
	def shouldReloadDelta():
		return sould_reload_delta

	@staticmethod
	@expose_to_js()
	def shouldReload():
		return model.should_reload()
	

	@staticmethod
	@expose_to_js()
	def getProjects():
		# if model.shouldReload():
		# 	model._load()

		return list(map(lambda p: {"id": p['id'], "name": p['name']}, model.projects))

	@staticmethod
	@expose_to_js()
	def getProject(id='p0'):
		# if model.shouldReload():
		# 	model._load()

		return list(filter(lambda p: p['id']==id, model.projects))[0]

	@staticmethod
	@expose_to_js()
	def removeProject(id):
		# if model.shouldReload():
		# 	model._load()

		model.projects = list(filter(lambda p: p['id']!=id, model.projects))
		model._store()
		return len(model.projects)

	@staticmethod
	@expose_to_js()
	def newProject():
		# if model.shouldReload():
		# 	model._load()

		projId = 'np' + str(len(model.projects))
		now = dt.datetime.now()
		model.projects.append({ 
			"id": projId,
			"name": "New Proj - " + projId,
			"startDate": str(now.year) + '-' + str(now.month).zfill(2) + '-01',
			"activities": []
		})
		
		model._store()
		
		return projId

	@staticmethod
	@expose_to_js()
	def renameProject(id, newName):
		# if model.shouldReload():
		# 	model._load()
			
		proj = Find(model.projects, lambda p: p['id']==id)

		proj['name']=newName

		model._store()

		return proj	

	@staticmethod
	@expose_to_js()
	def getProjectTags(id):
		# if model.shouldReload():
		# 	model._load()

		proj = Find(model.projects, lambda p: p['id']==id)

		tags = []
	
		for activity in proj.get('activities', []):
			for subtask in activity.get('subtasks', []):
				for todos in subtask.get('todos', []):
					for tag in todos.get('tags', []):
						if tag not in tags:
							tags.append(tag)

		return list(sorted(tags))
	
	
	@staticmethod
	@expose_to_js()
	def editActivity(project_id, activity, edits):
		# if model.shouldReload():
		# 	model._load()

		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])

		activity_ptr['name']=edits['name']
		activity_ptr['color']=edits['color']
		activity_ptr['subtasks_default_color']=edits['subtasks_default_color']
		activity_ptr['start']=edits['start']
		activity_ptr['len']=edits['len']
		activity_ptr['subtasks']=edits['subtasks']

		model._store()
		return activity_ptr
	

	@staticmethod
	@expose_to_js()
	def addActivity(project_id, activity):
		# if model.shouldReload():
		# 	model._load()

		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		
		model.task_id_gen+=1
		proj_ptr['activities'].append({**activity, 'id': "task"+str(model.task_id_gen)})

		model._store()
		return {}


	@staticmethod
	@expose_to_js()
	def deleteActivity(project_id, activity_id):
		# if model.shouldReload():
		# 	model._load()
			
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		proj_ptr['activities'] = Filter(proj_ptr['activities'], lambda a: a['id'] != activity_id)
		
		model._store()
		return {}
	
	@staticmethod
	@expose_to_js()
	def moveActivityTo(project_id, activity_idx, to_acitvity_idx):
		# if model.shouldReload():
		# 	model._load()
		if activity_idx == to_acitvity_idx:
			raise Exception("cannot move itself")
		
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		
		dragged_activity = proj_ptr['activities'][activity_idx]
		dropped_activity = proj_ptr['activities'][to_acitvity_idx]

		proj_ptr['activities'].remove(dragged_activity)
		proj_ptr['activities'].insert(proj_ptr['activities'].index(dropped_activity) + (0 if activity_idx > to_acitvity_idx else 1), dragged_activity)

		model._store()
		return {'new_idx': to_acitvity_idx}

	@staticmethod
	@expose_to_js()
	def moveActivityUp(project_id, activity_idx):
		# if model.shouldReload():
		# 	model._load()
			
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		if activity_idx == 0:
			raise Exception("cannot move up")

		proj_ptr['activities'][activity_idx-1], proj_ptr['activities'][activity_idx] = proj_ptr['activities'][activity_idx], proj_ptr['activities'][activity_idx-1]

		model._store()
		return {'new_idx': activity_idx-1}

	@staticmethod
	@expose_to_js()
	def moveActivityDown(project_id, activity_idx):
		# if model.shouldReload():
		# 	model._load()
			
		proj_ptr = Find(model.projects, lambda p: p['id']==project_id)
		if activity_idx == len(proj_ptr['activities'])-1:
			raise Exception("cannot move down")

		proj_ptr['activities'][activity_idx+1], proj_ptr['activities'][activity_idx] = proj_ptr['activities'][activity_idx], proj_ptr['activities'][activity_idx+1]
	
		model._store()
		return {'new_idx': activity_idx+1}
	

	@staticmethod
	@expose_to_js()
	def moveActivityLeft(project_id, activity):
		# if model.shouldReload():
		# 	model._load()
			
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		if str(activity_ptr['start']) == '0':
			raise Exception("cannot move left")

		activity_ptr['start'] = int(activity_ptr['start'])-1

		model._store()
		return {'new_start': activity_ptr['start']}

	@staticmethod
	@expose_to_js()
	def moveActivityRight(project_id, activity):
		# if model.shouldReload():
		# 	model._load()
			
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
	
		activity_ptr['start'] = int(activity_ptr['start'])+1

		model._store()
		return {'new_start': activity_ptr['start']}
    

	@staticmethod
	@expose_to_js()
	def incrementActivityLen(project_id, activity):
		# if model.shouldReload():
		# 	model._load()
			
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		activity_ptr['len'] = int(activity_ptr['len'])+1

		model._store()
		return {'new_len': activity_ptr['len']}
	

	@staticmethod
	@expose_to_js()
	def decrementActivityLen(project_id, activity):
		# if model.shouldReload():
		# 	model._load()
			
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		if str(activity_ptr['len']) == '0':
			raise Exception("cannot move left")
		
		activity_ptr['len'] = int(activity_ptr['len'])-1

		model._store()
		return {'new_len': activity_ptr['len']}
	

	@staticmethod
	@expose_to_js()
	def editSubTasks(project_id, activity, subTasks):
		# if model.shouldReload():
		# 	model._load()
			
		activity_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])
		activity_ptr['subtasks'] = subTasks

		model._store()
		return {}
	

	@staticmethod
	@expose_to_js()
	def editSubTask(project_id, activity, subTask, edits):
		# if model.shouldReload():
		# 	model._load()
			
		subtasks_ptr = Find(Find(model.projects, lambda p: p['id']==project_id)['activities'], lambda a: a['id']==activity['id'])['subtasks']
		subtask_ptr = Find(subtasks_ptr, lambda s: s['idx']==subTask['idx'])

		if subtask_ptr['idx'] != edits['newIdx'] and len(Filter(subtasks_ptr, lambda s: s['idx']==edits['newIdx'])) > 0:
			raise Exception("Already Exist, cannot move!")

		subtask_ptr['idx'] = edits['newIdx']
		subtask_ptr['name'] = edits['name']
		subtask_ptr['custom_color'] = edits['custom_color']
		subtask_ptr['description'] = edits['description']
		subtask_ptr['todos'] = edits['todos'] if edits['todos'] else []
		subtask_ptr['len'] = edits['len']

		model._store()
		return {}
	