setTimeout(() => {
    console.log("setTimeout 1 with 0 delay");
}, 0);

setTimeout(() => {
    console.log("setTimeout 2 with 0 delay");
}, 0);
  
setImmediate(() => {
    console.log("setImmediate 1");
},0);
  

  
