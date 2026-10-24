ObjC.import('Foundation');
function rd(p){return $.NSString.stringWithContentsOfFileEncodingError(p,$.NSUTF8StringEncoding,null).js}
function run(argv){var window={};var self=this;
  eval("var window=this.__w={};");
  var w={};var code=rd(argv[0])+"\n"+rd(argv[1]);
  var f=new Function("window",code+"\nreturn window;");var W=f(w);
  return W.LESSON.steps.map(function(s){return W.NARR.narr(s)}).join("\n@@@\n")}
