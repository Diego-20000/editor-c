#include <stdio.h>

int main()
{
    int A = -1;
    int B = -2;
    int R1, R2, R3, R4;
    char TEXTO[16] = "";
    char C = '?';

    R1 = scanf("%d", &A);
    R2 = scanf("%15s", TEXTO);
    R3 = scanf("%d", &B);
    R4 = scanf("%c", &C);

    printf("R1=%d A=%d\n", R1, A);
    printf("R2=%d TEXTO=[%s]\n", R2, TEXTO);
    printf("R3=%d B=%d\n", R3, B);
    printf("R4=%d C=%c COD=%d\n",
           R4, C, (int)(unsigned char)C);
}
