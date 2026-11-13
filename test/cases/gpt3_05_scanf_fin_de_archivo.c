#include <stdio.h>

int main()
{
    int A = -1;
    int B = -2;
    int C = -3;
    int R;

    R = scanf("%d %d %d", &A, &B, &C);

    printf("R=%d A=%d B=%d C=%d\n", R, A, B, C);
}
