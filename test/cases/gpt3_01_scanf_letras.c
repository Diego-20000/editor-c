#include <stdio.h>

int main()
{
    int N = 777;
    int R;
    char C = '?';

    R = scanf("%d", &N);
    scanf("%c", &C);

    printf("R=%d N=%d C=%c COD=%d\n",
           R, N, C, (int)(unsigned char)C);
}
