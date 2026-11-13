#include <stdio.h>

int main()
{
    int A = 0;
    int B = 0;
    int R1, R2;
    char C1 = '?';
    char C2 = '?';

    R1 = scanf("%d%c", &A, &C1);
    R2 = scanf("%d %c", &B, &C2);

    printf("R1=%d A=%d C1=%c COD1=%d\n",
           R1, A, C1, (int)(unsigned char)C1);

    printf("R2=%d B=%d C2=%c COD2=%d\n",
           R2, B, C2, (int)(unsigned char)C2);
}
