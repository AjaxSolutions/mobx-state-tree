import {
    Type,
    isPrimitive,
    fail,
    identity,
    INode,
    createNode,
    ISimpleType,
    IType,
    TypeFlags,
    IContext,
    IValidationResult,
    typeCheckSuccess,
    typeCheckFailure,
    isType,
    ObjectNode,
    IAnyType,
    IChildNodesMap,
    isInteger
} from "../internal"

// TODO: implement CoreType using types.custom ?
/**
 * @internal
 * @hidden
 */
export class CoreType<C, S, T> extends Type<C, S, T> {
    readonly shouldAttachNode = false
    readonly checker: (value: any) => boolean
    readonly flags: TypeFlags
    readonly initializer: (v: any) => any

    constructor(
        name: any,
        flags: TypeFlags,
        checker: any,
        initializer: (v: any) => any = identity
    ) {
        super(name)
        this.flags = flags
        this.checker = checker
        this.initializer = initializer
    }

    describe() {
        return this.name
    }

    instantiate(parent: ObjectNode | null, subpath: string, environment: any, snapshot: T): INode {
        return createNode(this, parent, subpath, environment, snapshot)
    }

    createNewInstance(node: INode, childNodes: IChildNodesMap, snapshot: any): any {
        return this.initializer(snapshot)
    }

    isValidSnapshot(value: any, context: IContext): IValidationResult {
        if (isPrimitive(value) && this.checker(value)) {
            return typeCheckSuccess()
        }
        const typeName = this.name === "Date" ? "Date or a unix milliseconds timestamp" : this.name
        return typeCheckFailure(context, value, `Value is not a ${typeName}`)
    }
}

/**
 * `types.string` - Creates a type that can only contain a string value.
 * This type is used for string values by default
 *
 * Example:
 * ```ts
 * const Person = types.model({
 *   firstName: types.string,
 *   lastName: "Doe"
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
export const string: ISimpleType<string> = new CoreType<string, string, string>(
    "string",
    TypeFlags.String,
    (v: any) => typeof v === "string"
)

/**
 * `types.number` - Creates a type that can only contain a numeric value.
 * This type is used for numeric values by default
 *
 * Example:
 * ```ts
 * const Vector = types.model({
 *   x: types.number,
 *   y: 1.5
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
export const number: ISimpleType<number> = new CoreType<number, number, number>(
    "number",
    TypeFlags.Number,
    (v: any) => typeof v === "number"
)

/**
 * `types.integer` - Creates a type that can only contain an integer value.
 * This type is used for integer values by default
 *
 * Example:
 * ```ts
 * const Size = types.model({
 *   width: types.integer,
 *   height: 10
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
export const integer: ISimpleType<number> = new CoreType<number, number, number>(
    "integer",
    TypeFlags.Integer,
    (v: any) => isInteger(v)
)

/**
 * `types.boolean` - Creates a type that can only contain a boolean value.
 * This type is used for boolean values by default
 *
 * Example:
 * ```ts
 * const Thing = types.model({
 *   isCool: types.boolean,
 *   isAwesome: false
 * })
 * ```
 */
// tslint:disable-next-line:variable-name
export const boolean: ISimpleType<boolean> = new CoreType<boolean, boolean, boolean>(
    "boolean",
    TypeFlags.Boolean,
    (v: any) => typeof v === "boolean"
)

/**
 * `types.null` - The type of the value `null`
 */
export const nullType: ISimpleType<null> = new CoreType<null, null, null>(
    "null",
    TypeFlags.Null,
    (v: any) => v === null
)

/**
 * `types.undefined` - The type of the value `undefined`
 */
export const undefinedType: ISimpleType<undefined> = new CoreType<undefined, undefined, undefined>(
    "undefined",
    TypeFlags.Undefined,
    (v: any) => v === undefined
)

/**
 * `types.Date` - Creates a type that can only contain a javascript Date value.
 *
 * Example:
 * ```ts
 * const LogLine = types.model({
 *   timestamp: types.Date,
 * })
 *
 * LogLine.create({ timestamp: new Date() })
 * ```
 */
// tslint:disable-next-line:variable-name
export const DatePrimitive: IType<number | Date, number, Date> = new CoreType<
    number | Date,
    number,
    Date
>(
    "Date",
    TypeFlags.Date,
    (v: any) => typeof v === "number" || v instanceof Date,
    (v: number | Date) => (v instanceof Date ? v : new Date(v))
)
;(DatePrimitive as any).getSnapshot = function(node: INode) {
    return node.storedValue.getTime()
}

/**
 * @internal
 * @hidden
 */
export function getPrimitiveFactoryFromValue(value: any): ISimpleType<any> {
    switch (typeof value) {
        case "string":
            return string
        case "number":
            return number // In the future, isInteger(value) ? integer : number would be interesting, but would be too breaking for now
        case "boolean":
            return boolean
        case "object":
            if (value instanceof Date) return DatePrimitive
    }
    throw fail("Cannot determine primitive type from value " + value)
}

/**
 * Returns if a given value represents a primitive type.
 *
 * @param type
 * @returns
 */
export function isPrimitiveType<
    IT extends
        | ISimpleType<string>
        | ISimpleType<number>
        | ISimpleType<boolean>
        | typeof DatePrimitive
>(type: IT): type is IT {
    return (
        isType(type) &&
        (type.flags &
            (TypeFlags.String |
                TypeFlags.Number |
                TypeFlags.Integer |
                TypeFlags.Boolean |
                TypeFlags.Date)) >
            0
    )
}
