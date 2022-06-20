export const BackendApi = {
  Controller: {

    id: "backend_api",

    def: {

      hello_demo: {
          hello: async $=>{
            return await pywebview.api.exec("HelloDemoController.hello")
          }
        }
    },

    onInit: async $=>{
      console.log(pywebview)
      console.log(pywebview.api)
      console.log(Object.keys(pywebview.api))
      console.log(await $.this.hello_demo.hello())
    }
  }
}