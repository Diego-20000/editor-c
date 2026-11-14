#include <stdio.h>
#include <string.h>

int main()
{
    char A[32] = "";
    char B[32] = "";

    int LA = 0;
    int LB = 0;
    int ULT_A = -1;
    int ULT_B = -1;

    if (fgets(A, sizeof(A), stdin) != NULL)
    {
        LA = (int)strlen(A);

        if (LA > 0)
        {
            ULT_A = (unsigned char)A[LA - 1];
        }
    }

    if (fgets(B, sizeof(B), stdin) != NULL)
    {
        LB = (int)strlen(B);

        if (LB > 0)
        {
            ULT_B = (unsigned char)B[LB - 1];
        }
    }

    printf("A=[%s] LEN=%d ULT=%d\n", A, LA, ULT_A);
    printf("B=[%s] LEN=%d ULT=%d\n", B, LB, ULT_B);
}
