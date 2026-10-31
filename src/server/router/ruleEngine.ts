import type {
  EventActionRule,
  FortuneStick,
  NormalizedLiveEvent,
  RuleConditionItem
} from '../../shared/types.ts';
import { sanitizeSpokenName } from './moderation.ts';

export interface RuleMatchEvaluation {
  matched: boolean;
  rule: EventActionRule;
  reason: string;
}

export class DynamicRuleEngine {
  private rules: EventActionRule[] = [];
  private readonly ruleLastFiredAt: Map<string, number> = new Map();

  constructor(initialRules: readonly EventActionRule[] = []) {
    this.setRules([...initialRules]);
  }

  public setRules(rules: EventActionRule[]): void {
    this.rules = [...rules].sort((a, b) => b.priority - a.priority);
  }

  public getRules(): EventActionRule[] {
    return [...this.rules];
  }

  public upsertRule(rule: EventActionRule): EventActionRule[] {
    const idx = this.rules.findIndex((r) => r.id === rule.id);
    if (idx >= 0) {
      this.rules[idx] = rule;
    } else {
      this.rules.push(rule);
    }
    this.rules.sort((a, b) => b.priority - a.priority);
    return this.getRules();
  }

  public deleteRule(ruleId: string): EventActionRule[] {
    this.rules = this.rules.filter((r) => r.id !== ruleId);
    this.ruleLastFiredAt.delete(ruleId);
    return this.getRules();
  }

  public evaluateFirstMatch(
    event: NormalizedLiveEvent,
    now = Date.now()
  ): RuleMatchEvaluation | null {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (rule.cooldownSec > 0) {
        const prev = this.ruleLastFiredAt.get(rule.id);
        if (prev !== undefined && now - prev < rule.cooldownSec * 1000) {
          continue;
        }
      }

      const check = this.evaluateRuleConditions(rule, event);
      if (check.matched) {
        this.ruleLastFiredAt.set(rule.id, now);
        return {
          matched: true,
          rule,
          reason: check.reason
        };
      }
    }
    return null;
  }

  private evaluateRuleConditions(
    rule: EventActionRule,
    event: NormalizedLiveEvent
  ): { matched: boolean; reason: string } {
    if (rule.conditions.length === 0) {
      return { matched: false, reason: 'Empty conditions' };
    }

    if (rule.matchMode === 'all') {
      const reasons: string[] = [];
      for (const cond of rule.conditions) {
        const ok = this.evaluateSingleCondition(cond, event);
        if (!ok) {
          return { matched: false, reason: `Condition failed: ${cond.field}` };
        }
        reasons.push(`${cond.field} ${cond.op} ${cond.value}`);
      }
      return { matched: true, reason: reasons.join(' AND ') };
    }

    // matchMode === 'any'
    for (const cond of rule.conditions) {
      if (this.evaluateSingleCondition(cond, event)) {
        return { matched: true, reason: `${cond.field} ${cond.op} ${cond.value}` };
      }
    }
    return { matched: false, reason: 'No ANY condition matched' };
  }

  private evaluateSingleCondition(cond: RuleConditionItem, event: NormalizedLiveEvent): boolean {
    const actual = this.resolveField(cond.field, event);
    if (actual === undefined || actual === null) return false;

    switch (cond.op) {
      case 'equals':
        return String(actual).toLowerCase() === String(cond.value).toLowerCase();
      case 'not_equals':
        return String(actual).toLowerCase() !== String(cond.value).toLowerCase();
      case 'contains':
        return String(actual).toLowerCase().includes(String(cond.value).toLowerCase());
      case 'starts_with':
        return String(actual).toLowerCase().startsWith(String(cond.value).toLowerCase());
      case 'greater_or_equal':
        return Number(actual) >= Number(cond.value);
      case 'less_or_equal':
        return Number(actual) <= Number(cond.value);
      default:
        return false;
    }
  }

  private resolveField(field: RuleConditionItem['field'], event: NormalizedLiveEvent): string | number | undefined {
    switch (field) {
      case 'event.type':
        return event.type;
      case 'event.comment':
        return event.comment ?? '';
      case 'event.gift.totalDiamonds':
        return event.gift?.totalDiamonds;
      case 'event.gift.giftName':
        return event.gift?.giftName;
      case 'event.likeCount':
        return event.likeCount;
      default:
        return undefined;
    }
  }

  public static interpolateTemplate(
    template: string,
    ctx: {
      nickname: string;
      wish?: string;
      giftName?: string;
      giftCount?: number;
      merit?: number;
      fortune?: FortuneStick;
    }
  ): string {
    const spokenName = sanitizeSpokenName(ctx.nickname);
    const map: Record<string, string> = {
      'user.nickname': spokenName,
      wish: ctx.wish || 'Nguyện cầu bình an cát tường',
      'gift.name': ctx.giftName || 'lễ vật',
      'gift.count': String(ctx.giftCount ?? 1),
      merit: String(ctx.merit ?? 10),
      'fortune.ttsSummary': ctx.fortune?.ttsSummary || '',
      'fortune.title': ctx.fortune?.title || ''
    };

    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
      return key in map ? map[key] : '';
    });
  }
}
