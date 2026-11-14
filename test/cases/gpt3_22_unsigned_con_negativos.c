#include <stdio.h>

int main()
{
    unsigned int A = (unsigned int)-1;
    unsigned int B = (unsigned int)-5;
    unsigned int C = A - 3U;

    printf("A=%u\n", A);
    printf("B=%u\n", B);
    printf("C=%u\n", C);
}
