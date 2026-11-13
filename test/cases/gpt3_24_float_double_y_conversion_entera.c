#include <stdio.h>

int main()
{
    float F = 0.1f;
    double D = 0.1;

    int CERCANO = (int)2147483000.0;
    long GRANDE = (long)1e10;

    printf("FLOAT=%.9g\n", F);
    printf("DOUBLE=%.17g\n", D);

    printf("CERCANO=%d\n", CERCANO);
    printf("GRANDE=%ld\n", GRANDE);
}
