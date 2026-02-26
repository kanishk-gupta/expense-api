import type { GraphQLContext } from '../context.ts';
// import type { TUserProps } from '../types/index.d.ts';
import { ACCESS_DENIED, UPDATE_PROFILE_FAILED, UPDATE_PROFILE_SUCCESS } from '../../messages.ts';
import type { TInputGQL, TResponseGQL, TUserProps } from '../../types/index.d.ts';

type TUserInput = {
  firstname: String;
  lastname?: String;
};

const updateProfile = async (
  _parent: unknown, 
  { input }: TInputGQL<TUserInput>, 
  context: GraphQLContext
): Promise<TResponseGQL<{ user: TUserProps | null }>> => {
  if (!context.userId) { throw new Error(ACCESS_DENIED); }

  try {
    const updatedUser = await context.prisma.user.update({
      where: { id: context.userId },
      data: {
        firstname: input?.firstname?.trim(),
        lastname: input?.lastname ? input?.lastname?.trim() : null
      }
    });
    return { success: true, message: UPDATE_PROFILE_SUCCESS, user: updatedUser };
  } catch (error) {
    return { success: false, message: UPDATE_PROFILE_FAILED, user: null };
  }
};

export default {
  updateProfile,
};