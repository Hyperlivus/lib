import { createParamDecorator, ExecutionContext, HttpException, HttpStatus } from "@nestjs/common";


export const QUERY_DTO = Symbol("QUERY_DTO");


export function QueryDto():ClassDecorator{
  return  (target)=>{
    Object.seal(target);
    Object.seal(target.prototype);
  }
}

export type QueryParamTypes = number | string | string[] | number[];
export type QueryParamOptions<T extends QueryParamTypes> = {
  defaultValue : T,
};
export type QueryField<T extends  QueryParamTypes> = [string, QueryParamOptions<T>];
export type QueryFields = QueryField<QueryParamTypes>[];

export function QueryParam<T extends QueryParamTypes>(options:QueryParamOptions<T>){
  const decorator:PropertyDecorator = (target, propertyKey)=> {
    const constructor = target.constructor;


    const field:QueryField<T> = [propertyKey as string, options];
    const fields:QueryField<T>[] = Reflect.getMetadata(QUERY_DTO, constructor);

    if (fields === undefined) {
      Reflect.defineMetadata(QUERY_DTO, [field], constructor);
    } else {
      const nextProperties = [...fields, field];
      Reflect.defineMetadata(QUERY_DTO, nextProperties, constructor);
    }

  }
  return decorator;
}

function initByFields<TFunction extends FunctionConstructor>(constructor:TFunction, fields:QueryFields){
  const object = new constructor();
  for (let field of fields){
    const propertyName = field[0];
    object[propertyName] = field[1];
  }
  return object;
}
function parseQuery( query:Object, dto:Function,  fields:QueryFields){
  const keys = Object.keys(query);

  keys.forEach(key=>{
    const field = fields.find(field=>{
      return field[0] === key;
    });
    if (field === undefined) {
      throw new HttpException(`Wrong query`, HttpStatus.BAD_REQUEST);
    }
    const defaultValue = field[1].defaultValue;
    const paramValue:string = query[key];

    if (typeof defaultValue === "number"){
      dto[key] = Number.parseInt(paramValue);
    } else if (typeof defaultValue === "string") {
      dto[key] = paramValue;
    }
  });
}
export const FromQuery = createParamDecorator((classType:any, ctx:ExecutionContext)=> {
  //TODO
  const constructor = classType as FunctionConstructor;

  const fields:QueryFields|undefined = Reflect.getMetadata(QUERY_DTO, constructor);

  if (fields === undefined){
    throw new Error(`Can\`t work with class ${constructor.prototype}, because that no have `);
  }
  const request = ctx.switchToHttp().getRequest();
  console.log(request.query);

  const queryDto = initByFields(constructor, fields);
  parseQuery(queryDto, request.query, fields);

  return queryDto;
})
