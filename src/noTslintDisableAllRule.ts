// tslint:disable:readonly-array restrict-plus-operands max-classes-per-file no-useless-cast no-use-before-declare cognitive-complexity

import * as Lint from "tslint";
import * as utils from "tsutils";
import * as ts from "typescript";

import { RuleFailure } from "tslint";
import { ENABLE_DISABLE_REGEX } from "tslint/lib/enableDisableRules";

export class Rule extends Lint.Rules.TypedRule {
  /* tslint:disable:object-literal-sort-keys */
  public static metadata: Lint.IRuleMetadata = {
    ruleName: "no-tslint-disable-all",
    description: "Avoid disabling all tslint rules.",
    options: {},
    optionsDescription: "None",
    type: "typescript",
    hasFix: false,
    typescriptOnly: true,
    requiresTypeInfo: false
  };

  public static FAILURE_STRING = "do not disable all tslint rules";

  public applyWithProgram(
    sourceFile: ts.SourceFile,
    _: ts.Program
  ): Lint.RuleFailure[] {
    // tslint:disable-next-line:no-let
    const failures: Lint.RuleFailure[] = [];
    utils.forEachComment(sourceFile, (fullText, comment) => {
      const commentText =
        comment.kind === ts.SyntaxKind.SingleLineCommentTrivia
          ? fullText.substring(comment.pos + 2, comment.end)
          : fullText.substring(comment.pos + 2, comment.end - 2);
      const parsed = parseComment(commentText);
      if (parsed !== undefined) {
        if (!parsed.isEnabled && parsed.rulesList === "all") {
          failures.push(
            new RuleFailure(
              sourceFile,
              comment.pos,
              comment.end,
              Rule.FAILURE_STRING,
              Rule.metadata.ruleName
            )
          );
        }
      }
    });
    return failures;
  }
}

type ParsedComment = Readonly<{
  isEnabled: boolean;
  modifier: string;
  rulesList: "all" | ReadonlyArray<string>;
}>;

function parseComment(commentText: string): ParsedComment | undefined {
  const match = ENABLE_DISABLE_REGEX.exec(commentText);
  if (match === null) {
    return undefined;
  }
  const baseResponse = {
    isEnabled: match[1] === "enable",
    modifier: match[2]
  };
  // remove everything matched by the previous regex to get only the specified rules
  // split at whitespaces
  // filter empty items coming from whitespaces at start, at end or empty list
  const rulesList = splitOnSpaces(commentText.substr(match[0].length));
  if (rulesList.length === 0 && match[3] === ":") {
    // nothing to do here: an explicit separator was specified but no rules to switch
    return undefined;
  }
  if (rulesList.length === 0 || rulesList.indexOf("all") !== -1) {
    // if list is empty we default to all enabled rules
    // if `all` is specified we ignore the other rules and take all enabled rules
    return {
      ...baseResponse,
      rulesList: "all"
    };
  }
  return {
    ...baseResponse,
    rulesList
  };
}

function splitOnSpaces(str: string): ReadonlyArray<string> {
  return str.split(/\s+/).filter(s => s !== "");
}
