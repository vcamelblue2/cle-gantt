export const Api = { Controller: {

  id: "api",

  onInit: async $ => {
    console.log(pywebview)
    console.log(pywebview.api)
    console.log(Object.keys(pywebview.api))

    await $.this.getProjects()
    await $.this.getProject()
    console.log($.this.project)
  },

  def: {
    getProjects: async ($)=>{
      $.scope.projects = await pywebview.api.exec("ProjectsController.getProjects")
    },
    getProject: async ($, id='p0')=>{
      $.scope.project = await pywebview.api.exec("ProjectsController.getProject", id)
    },

    editActivity: async ($, project_id, activity, edits)=>{
      await pywebview.api.exec("ProjectsController.editActivity", project_id, activity, edits)
      await $.this.getProject()
    },
    addActivity: async ($, project_id, name, color, start, len)=>{
      await pywebview.api.exec("ProjectsController.addActivity", project_id, {name: name, color: color, start: start, len: len})
      await $.this.getProject()
    },
    deleteActivity: async ($, project_id, activity_id)=>{
      await pywebview.api.exec("ProjectsController.deleteActivity", project_id, activity_id)
      await $.this.getProject()
    },

    moveActivityUp: async ($, project_id, activity_idx)=>{
      await pywebview.api.exec("ProjectsController.moveActivityUp", project_id, activity_idx)
      await $.this.getProject()
    },
    moveActivityDown: async ($, project_id, activity_idx)=>{
      await pywebview.api.exec("ProjectsController.moveActivityDown", project_id, activity_idx)
      await $.this.getProject()
    },
    moveActivityLeft: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.moveActivityLeft", project_id, activity)
      await $.this.getProject()
    },
    moveActivityRight: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.moveActivityRight", project_id, activity)
      await $.this.getProject()
    },
    incrementActivityLen: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.incrementActivityLen", project_id, activity)
      await $.this.getProject()
    },
    decrementActivityLen: async ($, project_id, activity)=>{
      await pywebview.api.exec("ProjectsController.decrementActivityLen", project_id, activity)
      await $.this.getProject()
    },

    editSubTasks: async ($, project_id, activity, subTasks, fullRefresf=false)=>{
      await pywebview.api.exec("ProjectsController.editSubTasks", project_id, activity, subTasks)
      if(fullRefresf){
        await $.this.getProject()
      }
    },
    editSubTask: async ($, project_id, activity, subtask, edits, fullRefresf=false)=>{
      await pywebview.api.exec("ProjectsController.editSubTask", project_id, activity, subtask, edits)
      if(fullRefresf){
        await $.this.getProject()
      }
    },
  }
}}