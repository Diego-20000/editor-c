#include <stdio.h>

int main()
{
    int A = 7;
    int B = -7;

    printf("[%+d]\n", A);
    printf("[% d]\n", A);
    printf("[%+d]\n", B);
    printf("[% d]\n", B);

    printf("[%05d]\n", A);
    printf("[%05d]\n", B);

    printf("[%#x]\n", 255);
    printf("[%#o]\n", 10);
    printf("[%#x]\n", 0);
    printf("[%#o]\n", 0);
}
