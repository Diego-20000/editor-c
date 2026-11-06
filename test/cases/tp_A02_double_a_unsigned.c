#include <stdio.h>
int main()
{
    double d = 3000000000.0;
    unsigned u = d;
    printf("%u %u\n", u, (unsigned)2500000000.0);
    return 0;
}
