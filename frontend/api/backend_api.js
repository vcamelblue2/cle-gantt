export const pywebviewReady = new Promise((resolve, reject)=>{

  console.log("setting up onpywebviewready event..")
  
  let notReady = setTimeout(()=>{
    console.log("PYWEBVIEW NOT READY..ABORTING..")
    reject()
  }, 15000) // 15 sec

  window.addEventListener('pywebviewready', function() {
    clearTimeout(notReady)
    resolve()
  });

})

export const Api = { Controller: {

  id: "api",

  def: {

    storeBackup: async ($)=>{
      await pywebview.api.exec("ProjectsController.storeBackup")
    },

    forceReloadData: async ($)=>{
      await pywebview.api.exec("ProjectsController.forceReloadData")
      await $.this.getProjects()
      await $.this.getProject($.project?.id)
    },
    
    getProjects: async ($)=>{
      $.scope.projects = await pywebview.api.exec("ProjectsController.getProjects")
    },
    getProject: async ($, id='p0')=>{
      $.scope.project = await pywebview.api.exec("ProjectsController.getProject", id)
    },
    newProject: async ($)=>{
      let id = await pywebview.api.exec("ProjectsController.newProject")
      return id
    },
    removeProject: async ($, id)=>{
      let numProj = await pywebview.api.exec("ProjectsController.removeProject", id)
      return numProj
    },
    renameProject: async ($, id, newName)=>{
      await pywebview.api.exec("ProjectsController.renameProject", id, newName)
    },

    editActivity: async ($, project_id, activity, edits)=>{
      await pywebview.api.exec("ProjectsController.editActivity", project_id, activity, edits)
      await $.this.getProject($.project?.id)
    },
    addActivity: async ($, project_id, name, color, start, len)=>{
      await pywebview.api.exec("ProjectsController.addActivity", project_id, {name: name, color: color, start: start, len: len})
      await $.this.getProject($.project?.id)
    },
    deleteActivity: async ($, project_id, activity_id)=>{
      await pywebview.api.exec("ProjectsController.deleteActivity", project_id, activity_id)
      await $.this.getProject($.project?.id)
    },

    moveActivityUp: async ($, project_id, activity_idx)=>{
      await pywebview.api.exec("ProjectsController.moveActivityUp", project_id, activity_idx)
      await $.this.getProject($.project?.id)
    },
    moveActivityDown: async ($, project_id, activity_idx)=>{
      await pywebview.api.exec("ProjectsController.moveActivityDown", project_id, activity_idx)
      await $.this.getProject($.project?.id)
    },
    moveActivityLeft: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.moveActivityLeft", project_id, activity)
      await $.this.getProject($.project?.id)
    },
    moveActivityRight: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.moveActivityRight", project_id, activity)
      await $.this.getProject($.project?.id)
    },
    incrementActivityLen: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.incrementActivityLen", project_id, activity)
      await $.this.getProject($.project?.id)
    },
    decrementActivityLen: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.decrementActivityLen", project_id, activity)
      await $.this.getProject($.project?.id)
    },

    editSubTasks: async ($, project_id, activity, subTasks, fullRefresf=false)=>{
      await pywebview.api.exec("ProjectsController.editSubTasks", project_id, activity, subTasks)
      if(fullRefresf){
        await $.this.getProject($.project?.id)
      }
    },
    editSubTask: async ($, project_id, activity, subtask, edits, fullRefresf=false)=>{
      await pywebview.api.exec("ProjectsController.editSubTask", project_id, activity, subtask, edits)
      if(fullRefresf){
        await $.this.getProject($.project?.id)
      }
    },

    // filesystem
    fs: {
      dataFolder: async ($)=>await pywebview.api.exec("FilesystemController.dataFolder"),
      readJson: async ($, path)=>await pywebview.api.exec("FilesystemController.readJson", path),
      writeJson: async ($, path, content, mode='w')=>await pywebview.api.exec("FilesystemController.writeJson", path, content, mode)
    },

    notes: {
      path: async ($)=>await $.this.fs.dataFolder() + "notes.json",
      load: async ($) => {
        try{
          return await $.this.fs.readJson(await $.this.notes.path())
        } catch (e){
          console.log(e)
          return []
        }
      },
      save: async ($, notes) => {
        try{
          return await $.this.fs.writeJson(await $.this.notes.path(), notes)
        } catch (e){
          console.log(e)
          throw e
        }
      }
    },
    
    todos: {
      path: async ($)=>await $.this.fs.dataFolder() + "todos.json",
      load: async ($) => {
        try{
          return await $.this.fs.readJson(await $.this.todos.path())
        } catch (e){
          console.log(e)
          throw e
        }
      },
      save: async ($, todos) => {
        try{
          return await $.this.fs.writeJson(await $.this.todos.path(), todos)
        } catch (e){
          console.log(e)
          throw e
        }
      }
    },

    planner: {
      users: $ => ['shared', 'vivi', 'aral', 'lamu'],
      path: async ($, usr='shared') =>{ if (!$.planner.users.inclueds(usr)){ throw Error("UNKNOWN USER")}; return await $.this.fs.dataFolder() + "planner_"+usr+".json"},
      load: async ($, usr='shared') => {
        try{
          return await $.this.fs.readJson(await $.this.planner.path(usr))
        } catch (e){
          console.log(e)
          throw e
        }
      },
      save: async ($, plans, usr='shared') => {
        try{
          return await $.this.fs.writeJson(await $.this.planner.path(usr), plans)
        } catch (e){
          console.log(e)
          throw e
        }
      }
    }
  }
}}