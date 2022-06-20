from functools import wraps

# You can extend to add more functions or new bootsrap action
class RegisteredApi:
    defs = {}
    default_sep = None # "/"
    to_exec_on_init = []
    show_registered_api_on_init = True

    def __init__(self):
        [ f() for f in RegisteredApi.to_exec_on_init ]
        if RegisteredApi.show_registered_api_on_init:
            print(RegisteredApi.defs)

    def exec(self, method, *args, **kwargs):
        return RegisteredApi.defs[method](*args, **kwargs)

# Bootstrap functions (no order!)
def exec_on_init(func):
    RegisteredApi.to_exec_on_init.append(func)
    return func

# Auto-Expose Decorator
def expose_to_js(route=None):
    def _wrapper(func):
        if route is None:
            RegisteredApi.defs[func.__qualname__ if RegisteredApi.default_sep is None else func.__qualname__.replace(".", RegisteredApi.default_sep)] = func
        else:
            RegisteredApi.defs[route] = func

        return func

    return _wrapper


# TESTS
if __name__ == "__main__":

    print(RegisteredApi.defs)


    @expose_to_js("myfunc")
    def myFunc(*args, **kwargs):
        print(myFunc.__qualname__, args, kwargs)

    @expose_to_js()
    def myFuncNoName(*args, **kwargs):
        print(myFuncNoName.__qualname__, args, kwargs)


    class Class1:

        @staticmethod
        @expose_to_js("class1.myfunc")
        def myFunc(*args, **kwargs):
            print(Class1.myFunc.__qualname__, args, kwargs)

        @staticmethod
        @expose_to_js()
        def myFuncNoName(*args, **kwargs):
            print(Class1.myFuncNoName.__qualname__, args, kwargs)

    print(RegisteredApi.defs)

    r = RegisteredApi()
    r.exec("myfunc", 1,2,3, "asf", x=2, z=3)
    r.exec("myFuncNoName", 1,2,3, "asf", x=2, z=3)
    r.exec("class1.myfunc", 1,2,3, "asf", x=2, z=3)
    r.exec("Class1.myFuncNoName", 1,2,3, "asf", x=2, z=3)