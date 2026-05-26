const asynchandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next)
  }
  catch (err) {
    res.status(err.statuscode || 500).json({
      success: false,
      message: err.message || "Internal Server Error",
    })
  }
}

export { asynchandler }

// const asynchandler = () => {}
// const asynchandler = (func) => ()=>{}
// create a function and wrap it with async/await inside an arrow function
// const asynchandler = (func) => async ()=>{}
      
