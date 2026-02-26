export type TUserProps = {
  id: string;
  firstname: string;
  lastname?: string | null;
  fullname?: string;
  email: string;
  createdAt: Date;
  updatedAt?: Date;
};