import pyparsing as pp
import re
from string import punctuation

punctuation_safe = re.sub('[:,]', '', punctuation)

def parse(s):
    equals = pp.Suppress('=')
    colon = pp.Suppress(':')
    comment = pp.Suppress(pp.Optional(pp.Literal('#') - pp.ZeroOrMore(pp.Word(pp.printables))))
    
    nonetoken = pp.Suppress(pp.CaselessLiteral("none"))
    model_file = pp.Regex(".*?\.(bngl|xml|target)")
    exp_file = pp.Regex(".*?\.(exp|con|prop)")
    mdmkey = pp.CaselessLiteral("model")
    mdmgram = mdmkey - equals - model_file - colon - (pp.delimitedList(exp_file) ^ nonetoken) - comment
    
    return mdmgram.parseString(s, parseAll=True).asList()

test_lines = [
    "model=examples/demo/parabola.bngl : examples/demo/par1.exp",
    "model=examples/egfr_ode/egfr_ode.bngl : examples/egfr_ode/timecourse.exp, examples/egfr_ode/doseresponse.exp"
]

for line in test_lines:
    try:
        print(f"Testing: {line}")
        res = parse(line)
        print(f"Result: {res}")
    except Exception as e:
        print(f"Failed: {e}")
