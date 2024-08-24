import { IsIn, IsMongoId, IsNotEmpty, IsString } from "class-validator";
import { TransactionsType } from "../enums/transactions-type.enum";

export class CreateTransactionDto {
  @IsNotEmpty()
  @IsMongoId()
  user: string;

  @IsNotEmpty()
  @IsMongoId()
  book: string;

  @IsString()
  @IsIn(['BORROW', 'RETURN'])
  type: TransactionsType;

  timestamp: Date;

}
