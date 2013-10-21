start
  = expr _ *

expr = template / literal

literal
  = chars:[^{}] { return chars.join(''); }

template = "{{" + name:[a-z] + "}}" { return name; }

identifier = ( [a-z 0-9_\-]* )

_ = whitespace*

whitespace = [\n\r\t ]