import { Prop, raw, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, SchemaTypes, Types } from "mongoose";
import { Book } from "src/books/schemas/book.schema";
import { User } from "src/users/schemas/user.schema";
import { TransactionsType } from "../enums/transactions-type.enum";

export type TransactionDocument = HydratedDocument<Transaction>;
@Schema()
export class Transaction {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: "User",
    required: true,
  })
  user: User | Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: "Book",
    required: true,
  })
  book: Book | Types.ObjectId;

  @Prop({ type: String, enum: ["BORROW", "RETURN"], required: true })
  type: TransactionsType;

  @Prop({ type: Date, default: Date.now })
  timestamp?: Date;
}
export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.set("toJSON", { flattenObjectIds: true, versionKey: false });
TransactionSchema.set("toObject", {
  flattenObjectIds: true,
  versionKey: false,
});
